import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="API de Produtos com SQLite")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # aceita qualquer origem (ok para estudo)
    allow_methods=["*"],      # GET, POST, PUT, DELETE...
    allow_headers=["*"],      # inclui o Content-Type: application/json
)
CAMINHO_BANCO = Path(__file__).resolve().parent / "loja.db"


class ProdutoEntrada(BaseModel):
    nome: str = Field(min_length=1)
    preco: float = Field(gt=0, allow_inf_nan=False)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor):
        valor = valor.strip()
        if not valor:
            raise ValueError("O nome não pode conter apenas espaços")
        return valor


def conectar():
    conexao = sqlite3.connect(CAMINHO_BANCO)
    conexao.row_factory = sqlite3.Row
    return conexao


@app.get("/")
def inicio():
    return {"mensagem": "API de produtos com SQLite funcionando!"}


@app.get("/produtos")
def listar_produtos():
    conexao = conectar()
    try:
        linhas = conexao.execute(
            "SELECT id, nome, preco FROM produtos ORDER BY id"
        ).fetchall()
        return [dict(linha) for linha in linhas]
    finally:
        conexao.close()


@app.get("/produtos/{produto_id}")
def buscar_produto(produto_id: int):
    conexao = conectar()
    try:
        linha = conexao.execute(
            "SELECT id, nome, preco FROM produtos WHERE id = ?",
            (produto_id,),
        ).fetchone()
        if linha is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return dict(linha)
    finally:
        conexao.close()


@app.post("/produtos", status_code=201)
def criar_produto(produto: ProdutoEntrada):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
            (produto.nome, produto.preco),
        )
        conexao.commit()
        return {"id": cursor.lastrowid, "nome": produto.nome, "preco": produto.preco}
    finally:
        conexao.close()


@app.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, produto: ProdutoEntrada):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "UPDATE produtos SET nome = ?, preco = ? WHERE id = ?",
            (produto.nome, produto.preco, produto_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        conexao.commit()
        return {"id": produto_id, "nome": produto.nome, "preco": produto.preco}
    finally:
        conexao.close()


@app.delete("/produtos/{produto_id}")
def excluir_produto(produto_id: int):
    conexao = conectar()
    try:
        cursor = conexao.execute(
            "DELETE FROM produtos WHERE id = ?", (produto_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        conexao.commit()
        return {"mensagem": "Produto excluído com sucesso"}
    finally:
        conexao.close()