export const downloadAsset = async (asset) => {
    const response = await fetch(asset.file_url);

    const arrayBuffer = await response.arrayBuffer();

    const mimeType =
      response.headers.get('content-type') ||
      asset.mime_type ||
      'application/octet-stream';

    const blob = new Blob([arrayBuffer], { type: mimeType });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = asset.file_name; // MUST have extension
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };