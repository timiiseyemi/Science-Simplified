import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const ImageUpload = ({
    onImageUpload,
    initialImageUrl,
    uploadUrl = "/api/images/upload-image",
    imageType = "default",
}) => {
    const [file, setFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(initialImageUrl || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    // Sync with parent
    useEffect(() => {
        setUploadedUrl(initialImageUrl);
    }, [initialImageUrl]);

    const handleChange = (event) => {
        setFile(event.target.files[0]);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("imageType", imageType);

        try {
            const response = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                setError("Upload failed. Please try again.");
                return;
            }

            const data = await response.json();
            setUploadedUrl(data.url);
            onImageUpload(data.url);
            setFile(null);
        } catch (err) {
            setError("An error occurred during upload.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <input
                type="file"
                onChange={handleChange}
                className="image-upload__input w-full md:w-max file:mr-2.4rem 
                file:py-[2rem] file:mr-8 file:mb-8 file:px-[3.5rem] 
                file:rounded-[10px] file:border-0 file:text-2.1rem 
                file:font-semibold file:bg-primary file:text-primary-foreground 
                hover:file:bg-primary/90"
                accept="image/*"
                disabled={uploading}
            />

            {/* UPLOAD BUTTON ONLY */}
            {!uploadedUrl && (
                <Button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                >
                    {uploading ? "Uploading..." : "Upload Image to Cloud"}
                </Button>
            )}

            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default ImageUpload;