/** 工事名（表示レベル2）→ 概要候補。DB 側の類似マスタから App がマージします。 */
export const DESCRIPTION_SUGGESTIONS: Record<string, string[]> = {
  クロス工事: ["クロス張替"],
  床工事: ["床材張替"],
  建具: ["建具交換"],
  給排水: ["水栓交換"],
  電気: ["照明器具取替"],
};
