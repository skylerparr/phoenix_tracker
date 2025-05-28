import React from "react";
import { TextField, Autocomplete, Chip } from "@mui/material";
interface IssueAutoCompleteComponentProps {
  options: string[];
  value: string[];
  onChange: (newValue: string[]) => void;
  inputValue: string;
  onInputChange: (newValue: string) => void;
  placeholder: string;
  handleCreateNew?: (value: string) => void;
  onSelected?: (value: string) => void;
  getChipColor?: (value: string) => string;
}

const IssueAutoCompleteComponent: React.FC<IssueAutoCompleteComponentProps> = ({
  options,
  value,
  onChange,
  inputValue,
  onInputChange,
  placeholder,
  handleCreateNew,
  getChipColor = () => "#2e7d32",
}) => {
  const handleCreateIfValid = () => {
    if (
      handleCreateNew &&
      inputValue &&
      !options.includes(inputValue) &&
      !value.includes(inputValue)
    ) {
      // Add the new value to the existing values (create the chip)
      const newValues = [...value, inputValue];
      onChange(newValues);

      // Call the external handler
      handleCreateNew(inputValue);

      // Clear the input
      onInputChange("");
    }
  };

  return (
    <Autocomplete
      sx={{ width: "100%" }}
      multiple
      freeSolo
      options={options.filter((option) => !value.includes(option))}
      value={value}
      onChange={(event: React.SyntheticEvent, newValue: string[]) => {
        if (handleCreateNew) {
          onChange(newValue);
        } else {
          newValue.every((value) => options.includes(value)) &&
            onChange(newValue);
        }
      }}
      inputValue={inputValue}
      onInputChange={(event: React.SyntheticEvent, newInputValue: string) => {
        onInputChange(newInputValue);
      }}
      onKeyDown={
        handleCreateNew !== undefined
          ? (event) => {
              if (event.key === "Enter") {
                handleCreateIfValid();
              }
            }
          : undefined
      }
      renderTags={(value: string[], getTagProps: any) =>
        value.map((option: string, index: number) => {
          const { key, ...props } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={option}
              {...props}
              size="small"
              sx={{ color: "#FFFFFF", backgroundColor: getChipColor(option) }}
            />
          );
        })
      }
      renderInput={(
        params: React.JSX.IntrinsicAttributes &
          import("@mui/material").TextFieldProps,
      ) => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          placeholder={value.length === 0 ? placeholder : ""}
          onBlur={
            handleCreateNew !== undefined ? handleCreateIfValid : undefined
          }
          sx={{
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            "& .MuiInputBase-input": {
              color: "#000000",
            },
          }}
        />
      )}
    />
  );
};
export default IssueAutoCompleteComponent;
