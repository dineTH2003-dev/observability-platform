const formatDate = (value) => {
  const d = new Date(value);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCellValue = (key, value) => {
  if (value === null || value === undefined) return "-";
  if (key.toLowerCase().includes("date")) return formatDate(value);
  if (typeof value === "number") return value.toString();
  return String(value);
};

module.exports = { formatDate, formatCellValue };