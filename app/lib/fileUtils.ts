export const generateUniqueFileName = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const [hours, minutes] = time.split(":");
  return `${date}_${hours}_${minutes}`;
};
