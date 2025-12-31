// frontend/src/utils/aiHelper.js
export const requestAICaption = async (file) => {
  if (!file) throw new Error("No file");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/story/ai-caption/", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("AI caption failed");
  return await res.json(); // { caption: "..." }
};

export const createStoryApi = async (formData) => {
  const res = await fetch("/api/story/upload/", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return await res.json();
};
