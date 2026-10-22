import sqlite3
from pathlib import Path

PASTA = Path(__file__).resolve().parent
caminho_banco = PASTA / "loja.db"
sql = (PASTA / "schema.sql").read_text(encoding="utf-8")

conexao = sqlite3.connect(caminho_banco)
try:
    conexao.executescript(sql)
    conexao.commit()
finally:
    conexao.close()

print(f"Banco e tabela prontos em: {caminho_banco}")