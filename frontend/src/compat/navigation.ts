const router = {
  push: (url: string) => window.location.assign(url),
  replace: (url: string) => window.location.replace(url),
  refresh: () => {},
};
export const useRouter = () => router;

