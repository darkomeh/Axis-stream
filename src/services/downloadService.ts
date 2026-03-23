export const useDownloadManager = () => {
  return {
    startDownload: (id: string, title: string, url: string) => {
      window.open(url, '_blank');
    }
  };
};
