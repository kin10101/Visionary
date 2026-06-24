export type Spec = {
  id: string;
  title: string;
  status: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  content_markdown?: string | null;
};

export type SpecVersion = {
  id: string;
  version_number: number;
  change_description: string;
  created_at: string;
  content_markdown?: string | null;
};

export type UploadedFile = {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
};
