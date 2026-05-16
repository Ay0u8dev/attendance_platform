package ma.eniad.userservice.utils.excel.teacher;

import ma.eniad.userservice.dto.teacher.excel.TeacherExcelRowDTO;
import ma.eniad.userservice.exception.InvalidExcelFileException;

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
public class TeacherExcelParser {
    private static final ThreadLocal<DataFormatter> DATA_FORMATTER = 
        ThreadLocal.withInitial(DataFormatter::new);
    public List<TeacherExcelRowDTO> parse(MultipartFile file) {

        List<TeacherExcelRowDTO> rows = new ArrayList<>();

        try (
            InputStream inputStream =
                file.getInputStream();

            Workbook workbook =
                new XSSFWorkbook(inputStream)
        ) {
            
            if (workbook.getNumberOfSheets() == 0) {
                throw new InvalidExcelFileException("Excel file contains no sheets");
            }
            

            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);

                if (isRowEmpty(row)) {
                    continue;
                }

                TeacherExcelRowDTO excelRow = TeacherExcelRowDTO.builder()
                    .rowNumber(i + 1)
                    .firstName(getCellValue(row.getCell(0)))
                    .lastName(getCellValue(row.getCell(1)))
                    .email(getCellValue(row.getCell(2)))
                    .build();

                rows.add(excelRow);
            }

        } catch (IOException e) {
            throw new InvalidExcelFileException("Failed to parse Excel file: " + e.getMessage());
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
                return DATA_FORMATTER.get().formatCellValue(cell).trim();
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return DATA_FORMATTER.get().formatCellValue(cell).trim();
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