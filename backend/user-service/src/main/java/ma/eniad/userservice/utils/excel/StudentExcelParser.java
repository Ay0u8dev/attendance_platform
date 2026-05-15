package ma.eniad.userservice.utils.excel;

import ma.eniad.userservice.dto.student.excel.StudentExcelRowDTO;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Component
public class StudentExcelParser {
    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    public List<StudentExcelRowDTO> parse(MultipartFile file) {

        List<StudentExcelRowDTO> rows = new ArrayList<>();

        try (
            InputStream inputStream =
                file.getInputStream();

            Workbook workbook =
                new XSSFWorkbook(inputStream)
        ) {

            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);

                if (isRowEmpty(row)) {
                    continue;
                }

                StudentExcelRowDTO excelRow = StudentExcelRowDTO.builder()
                    .rowNumber(i + 1)
                    .firstName(getCellValue(row.getCell(0)))
                    .lastName(getCellValue(row.getCell(1)))
                    .email(getCellValue(row.getCell(2)))
                    .numApogee(getCellValue(row.getCell(3)))
                    .build();

                rows.add(excelRow);
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to parse Excel file", e);
        }

        return rows;
    }

    private String getCellValue(Cell cell) {

        if (cell == null) {
            return null;
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return DATA_FORMATTER.formatCellValue(cell).trim();
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return DATA_FORMATTER.formatCellValue(cell).trim();
            default:
                return null;
        }
    }

    private boolean isRowEmpty(Row row) {

        if (row == null) {
            return true;
        }

        for (Cell cell : row) {

            if (cell != null &&
                cell.getCellType() != CellType.BLANK) {

                String value = getCellValue(cell);

                if (value != null && !value.isBlank()) {
                    return false;
                }
            }
        }

        return true;
    }

}