interface Props {
  label: string;
}

const RememberCheckbox = ({ label }: Props) => {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded"
      />

      <span className="text-sm">{label}</span>
    </label>
  );
};

export default RememberCheckbox;