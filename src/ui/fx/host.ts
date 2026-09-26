/** PixiJS の描き場を置く要素の id（App の FxLayer が置き、./stage が描き場を入れる） */
export const FX_HOST_ID = 'fx-layer';

/** 因果の線をたどる光の粒の、いまのコマの道（画面の座標）と、描いてよい上下の範囲（シートの本文の見えている所） */
export interface TrailFrame {
  points: readonly { x: number; y: number }[];
  top: number;
  bottom: number;
}
