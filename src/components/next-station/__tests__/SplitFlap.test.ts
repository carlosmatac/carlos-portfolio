import { describe, expect, it } from "vitest";
import { FLAP_ALPHABET, flapCells, turnFlaps } from "../SplitFlap";
import { SOMEWHERE } from "../NextStation";
import { places } from "@/content/places";

describe("Split-flap board", () => {
  it("fits text to the board, leaving characters the drum lacks blank", () => {
    expect(flapCells("St. Louis", 11).join("")).toBe("ST. LOUIS  ");
    expect(flapCells("Año", 3).join("")).toBe("A O");
    expect(flapCells("San Francisco!", 13).join("")).toBe("SAN FRANCISCO");
  });

  it("turns every cell forward one flap at a time until the word settles", () => {
    const target = flapCells("AB", 2);
    let cells = flapCells("", 2), turns = 0;
    for (let next = turnFlaps(cells, target, turns, [0, 0]); next; next = turnFlaps(cells, target, ++turns, [0, 0])) cells = next;
    expect(cells).toEqual(target);
    expect(turns).toBe(FLAP_ALPHABET.indexOf("B"));
  });

  it("holds lagging cells back, and wraps around the drum", () => {
    expect(turnFlaps([" ", " "], ["A", "A"], 0, [0, 3])).toEqual(["A", " "]);
    expect(turnFlaps(["?"], ["A"], 0, [0])).toEqual([" "]);
  });

  it("can show every destination it will ever be asked for", () => {
    const words = [...SOMEWHERE, ...places.flatMap(place => [place.city, place.code, place.note]), "20??", "Here now", "Arrived", "Who knows", "TBA"];
    for (const word of words) expect([...word.toUpperCase()].every(char => FLAP_ALPHABET.includes(char)), word).toBe(true);
  });
});
