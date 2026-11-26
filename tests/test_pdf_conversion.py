"""Regressão da extração: primeira linha das páginas seguintes e rodapé total."""
import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import pymupdf


class PdfConversionTest(unittest.TestCase):
    def test_first_row_and_total(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / 'fixture.pdf'
            doc = pymupdf.open()
            for code, baseline in [('001', 163), ('002', 140)]:
                page = doc.new_page(width=842, height=595)
                for x, text in [(45, code), (79, 'Pessoa de Teste'), (278, '02/01/1980'), (465, 'Rua de Teste'), (663, 'Palotina'), (760, '01/10/2026')]:
                    page.insert_text((x, baseline), text, fontsize=9)
            page.insert_text((45, 180), 'Total: 2', fontsize=9)
            page.insert_text((45, 200), 'Total Geral: 2', fontsize=9)
            doc.save(source)
            doc.close()
            subprocess.run([sys.executable, str(root / 'scripts/convert-parishioners-pdf.py'), str(source), str(folder / 'out')], check=True, capture_output=True)
            with (folder / 'out/dizimistas-revisao.csv').open(encoding='utf-8-sig', newline='') as file:
                rows = list(csv.DictReader(file, delimiter=';'))
            self.assertEqual([row['Código'] for row in rows], ['001', '002'])
            report = json.loads((folder / 'out/validacao-importacao.json').read_text(encoding='utf-8'))
            self.assertEqual(report['total_extraido'], report['total_declarado'])
            self.assertEqual(report['registros_por_pagina'], [1, 1])


if __name__ == '__main__':
    unittest.main()
