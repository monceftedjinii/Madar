from dataclasses import dataclass
from datetime import datetime
from io import BytesIO, StringIO
import csv

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


@dataclass
class ExportFile:
    filename: str
    content_type: str
    content: bytes

    @property
    def size(self):
        return len(self.content)


class ExportService:
    """Service to export report/dashboard/statistics data into downloadable files."""

    @classmethod
    def _timestamp(cls):
        return datetime.now().strftime('%Y%m%d_%H%M%S')

    @classmethod
    def _normalize_report(cls, report):
        if report is None:
            return {'title': 'Report', 'widgets': [], 'data': {}}

        if hasattr(report, 'get_widgets') and callable(report.get_widgets):
            widgets = report.get_widgets()
            return {
                'title': 'Dashboard Report',
                'widgets': widgets,
                'data': {
                    'configuration': getattr(report, 'configuration', {}),
                    'period': getattr(report, 'period', None),
                    'is_public': getattr(report, 'is_public', None),
                    'auto_refresh': getattr(report, 'auto_refresh', None),
                    'last_refreshed_at': getattr(report, 'last_refreshed_at', None),
                }
            }

        if hasattr(report, 'to_dict') and callable(report.to_dict):
            payload = report.to_dict()
            return {
                'title': payload.get('title') or payload.get('type') or 'Report',
                'widgets': payload.get('widgets') or [],
                'data': payload,
            }

        if isinstance(report, dict):
            return {
                'title': report.get('title') or report.get('type') or 'Report',
                'widgets': report.get('widgets') or [],
                'data': report,
            }

        return {
            'title': 'Report',
            'widgets': [],
            'data': {'value': str(report)},
        }

    @classmethod
    def _extract_rows(cls, normalized_report):
        rows = []

        data = normalized_report.get('data', {}) or {}
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                rows.append(['meta', key, str(value)])
            else:
                rows.append(['meta', key, value])

        widgets = normalized_report.get('widgets', []) or []
        for index, widget in enumerate(widgets, start=1):
            widget_type = widget.get('widget') or widget.get('type') or 'widget'
            widget_name = widget.get('name') or f'WIDGET_{index}'
            payload = widget.get('payload') or widget.get('data') or {}

            if isinstance(payload, dict) and 'data_json' in payload:
                data_json = payload.get('data_json') or {}
                rows.append([widget_type, f'{widget_name}_labels', str(data_json.get('labels', []))])
                rows.append([widget_type, f'{widget_name}_values', str(data_json.get('values', []))])
            elif isinstance(payload, dict):
                for key, value in payload.items():
                    if isinstance(value, (dict, list)):
                        rows.append([widget_type, f'{widget_name}.{key}', str(value)])
                    else:
                        rows.append([widget_type, f'{widget_name}.{key}', value])
            else:
                rows.append([widget_type, widget_name, str(payload)])

        if not rows:
            rows.append(['info', 'message', 'No report data available'])

        return rows

    @classmethod
    def export_excel(cls, report):
        """Creates an Excel (.xlsx) file from report data with tables and chart data."""
        normalized = cls._normalize_report(report)
        rows = cls._extract_rows(normalized)

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = 'Report'

        title = normalized.get('title') or 'Report'
        worksheet.append([title])
        worksheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=3)
        worksheet['A1'].font = Font(bold=True, size=14)
        worksheet['A1'].alignment = Alignment(horizontal='center')

        headers = ['Section', 'Metric', 'Value']
        worksheet.append(headers)
        for cell in worksheet[2]:
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal='center')

        for row in rows:
            worksheet.append(row)

        worksheet.column_dimensions['A'].width = 22
        worksheet.column_dimensions['B'].width = 40
        worksheet.column_dimensions['C'].width = 80

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        return ExportFile(
            filename=f"report_{cls._timestamp()}.xlsx",
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            content=output.getvalue(),
        )

    @classmethod
    def export_pdf(cls, report):
        """Creates a formatted PDF (.pdf) file from report data."""
        normalized = cls._normalize_report(report)
        rows = cls._extract_rows(normalized)

        output = BytesIO()
        document = SimpleDocTemplate(output, pagesize=letter, topMargin=24, bottomMargin=24)
        styles = getSampleStyleSheet()

        title = normalized.get('title') or 'Report'
        story = [Paragraph(title, styles['Title']), Spacer(1, 12)]

        headers = ['Section', 'Metric', 'Value']
        table_data = [headers] + [[str(r[0]), str(r[1]), str(r[2])] for r in rows]
        table = Table(table_data, repeatRows=1, colWidths=[110, 180, 250])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        story.append(table)
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Generated at: {datetime.now().isoformat(timespec='seconds')}", styles['Normal']))

        document.build(story)
        output.seek(0)

        return ExportFile(
            filename=f"report_{cls._timestamp()}.pdf",
            content_type='application/pdf',
            content=output.getvalue(),
        )

    @classmethod
    def export_csv(cls, report):
        """Exports report data to CSV (.csv) for analysis and external tools."""
        normalized = cls._normalize_report(report)
        rows = cls._extract_rows(normalized)

        csv_stream = StringIO()
        writer = csv.writer(csv_stream)
        writer.writerow(['Section', 'Metric', 'Value'])
        writer.writerows(rows)

        content = csv_stream.getvalue().encode('utf-8-sig')

        return ExportFile(
            filename=f"report_{cls._timestamp()}.csv",
            content_type='text/csv',
            content=content,
        )
