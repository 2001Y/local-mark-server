export type OperationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type FileOperationError = {
  type: "ItemExists" | "Unknown";
  message: string;
};
