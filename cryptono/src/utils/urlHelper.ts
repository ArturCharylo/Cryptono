export function normalizeUrl(url: string): string {
    return url.toLowerCase().replace(/https?:\/\//, '').split('/')[0];
}
