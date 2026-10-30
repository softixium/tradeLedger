import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const DatePickerField = ({ slotProps, ...pickerProps }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      format="DD/MM/YYYY"
      {...pickerProps}
      slotProps={{
        ...slotProps,
        field: { clearable: true, ...slotProps?.field },
        textField: { fullWidth: true, ...slotProps?.textField },
      }}
    />
  </LocalizationProvider>
);

export default DatePickerField;
