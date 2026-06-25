GERADOR DE READAPTAÇÃO FUNCIONAL - V5

Como testar:
1. Extraia a pasta.
2. Abra o terminal dentro da pasta.
3. Rode: python -m http.server 8000
4. Acesse: http://localhost:8000

Como atualizar modelos:
- Substitua o arquivo .docx dentro da pasta modelos/ mantendo exatamente o mesmo nome.
- Não altere o arquivo dentro do ZIP/RAR; altere a pasta extraída que está sendo servida pelo Python.
- Depois de substituir, atualize a página com Ctrl+F5.
- Esta versão força o navegador a buscar o modelo novo, evitando cache.

Nomes esperados:
modelos/manutencao_masculino.docx
modelos/manutencao_feminino.docx
modelos/mudanca_masculino.docx
modelos/mudanca_feminino.docx
modelos/extrato_parecer.docx
modelos/extrato_ato.docx
