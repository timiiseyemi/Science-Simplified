import { sites } from "./sites";
const key = process.env.NEXT_PUBLIC_SITE_KEY || "NF";
export const tenant = sites[key];
