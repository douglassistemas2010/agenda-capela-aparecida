"""Converte o relatório Cúria Online em CSV privado, sem acessar o banco.
Uso: python scripts/convert-parishioners-pdf.py arquivo.pdf dados-privados
Requer PyMuPDF. Coordenadas específicas do relatório em paisagem; revisar saída.
"""
import csv
import datetime as dt
import json
import re
import sys
import hashlib
from pathlib import Path
import pymupdf

source, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
records, warnings = [], []
seen = set()
counts = []

def date(value, code, label):
    if not value or value == '00/00/0000':
        if value:
            warnings.append({'codigo': code, 'campo': label, 'motivo': 'Data zerada mantida como ausente'})
        return ''
    try:
        return dt.datetime.strptime(value, '%d/%m/%Y').date().isoformat()
    except ValueError:
        raise ValueError(f'Data não reconhecida no código {code}, campo {label}')

with pymupdf.open(source) as document:
    for number, page in enumerate(document, 1):
        if not 830 < page.rect.width < 850:
            raise ValueError('Formato de página diferente do relatório conhecido')
        words = page.get_text('words')
        starts = sorted([w for w in words if 40 <= w[0] < 70 and 120 < w[1] < 550 and re.fullmatch(r'\d+', w[4])], key=lambda w: w[1])
        spans = [s for b in page.get_text('dict')['blocks'] if 'lines' in b for line in b['lines'] for s in line['spans']]
        counts.append(len(starts))
        if not starts:
            raise ValueError(f'Nenhum cadastro localizado na página {number}; revisão necessária')
        for index, start in enumerate(starts):
            code = start[4]
            if code in seen:
                raise ValueError(f'Código repetido: {code}')
            seen.add(code)
            bottom = starts[index + 1][1] - 1 if index + 1 < len(starts) else min(start[1] + 20, 550)
            row = sorted([s for s in spans if start[1] - 1 <= s['bbox'][1] < bottom], key=lambda s: (round(s['bbox'][1]/3), s['bbox'][0]))
            def column(left, right):
                return ' '.join(s['text'] for s in row if left <= s['bbox'][0] < right).strip()
            name = column(75, 275)
            birthday_text = column(275, 330)
            birthday = date(birthday_text, code, 'nascimento')
            residential, mobile = column(330, 397), column(397, 463)
            phone = mobile or residential
            notes = [f'Origem: {source.name}; página {number}.']
            if phone and not 10 <= len(re.sub(r'\D', '', phone)) <= 15:
                notes.append(f'Telefone original sem DDD confirmado: {phone}')
                warnings.append({'codigo': code, 'campo': 'telefone', 'motivo': 'Sem DDD; preservado nas observações'})
                phone = ''
            if '\ufffd' in name:
                warnings.append({'codigo': code, 'campo': 'nome', 'motivo': 'Caractere não extraído; conferir no PDF'})
            if not name:
                raise ValueError(f'Nome ausente no código {code}')
            records.append({'Código': code, 'Nome': name, 'Telefone': phone, 'Telefone secundário': residential if mobile else '', 'Nascimento': birthday,
                'Endereço': column(463, 660), 'Cidade': column(660, 755), 'Última contribuição': date(column(755, 840), code, 'ultima_contribuicao'), 'Observações': ' '.join(notes)})
    totals = re.findall(r'Total Geral:\s*(\d+)', document[-1].get_text())
    if len(totals) != 1 or int(totals[0]) != len(records):
        raise ValueError(f'Total extraído ({len(records)}) diferente do total declarado ({totals})')

with (output / 'dizimistas-revisao.csv').open('w', encoding='utf-8-sig', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=list(records[0]), delimiter=';')
    writer.writeheader()
    writer.writerows(records)
(output / 'pendencias-importacao.json').write_text(json.dumps(warnings, ensure_ascii=False, indent=2), encoding='utf-8')
(output / 'validacao-importacao.json').write_text(json.dumps({'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'paginas': len(counts), 'registros_por_pagina': counts, 'total_declarado': int(totals[0]), 'total_extraido': len(records), 'codigos_unicos': len(seen), 'pendencias_por_campo': {field: sum(w['campo'] == field for w in warnings) for field in sorted({w['campo'] for w in warnings})}, 'gravado_no_banco': False}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'cadastros': len(records), 'pendencias': len(warnings), 'gravacao_no_banco': False}))
