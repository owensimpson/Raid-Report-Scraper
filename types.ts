export type PGCRInfo = {
  id: number,
  tags: string[]
}
export type RRTag = {
  raid: string,
  id: number,
  tags: string[]
}
export type RaidInfo = {
  raid: string;
  tags: RRTag[];
}
export type RaidDict = {
  [raid: string]: RaidInfo
};