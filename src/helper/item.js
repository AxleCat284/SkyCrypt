import { db } from "../mongo.js";
import sanitize from "mongo-sanitize";

/**
 * Gathers Item Data visualized similarily to in-game NBT format based on a query
 * @param {Object} query Query with optional properties
 * @param {string} [query.skyblockId] Item SkyBlock ID
 * @param {number} [query.id] Item Vanilla ID
 * @param {string} [query.name] Item name
 * @param {number} [query.damage] Item damage value
 * @returns {*} Item Data
 */
export async function getItemData(query = {}) {
  query = Object.assign({ skyblockId: undefined, id: undefined, name: undefined, damage: undefined }, query);
  const item = { id: -1, Damage: 0, Count: 1, tag: { ExtraAttributes: {} } };
  let dbItem = {};

  /**
   * Look for DB items if possible with Skyblock ID or query name
   */
  if (query.skyblockId !== undefined) {
    query.skyblockId = sanitize(query.skyblockId);

    if (query.skyblockId.includes(":")) {
      const split = query.skyblockId.split(":");

      query.skyblockId = split[0];
      query.damage = new Number(split[1]);
    }

    dbItem = (await db.collection("items").findOne({ id: query.skyblockId })) ?? {};
  }

  if (query.name !== undefined) {
    const results = await db
      .collection("items")
      .find({ $text: { $search: query.name } })
      .toArray();

    const filteredResults = results.filter((a) => a.name.toLowerCase() == query.name.toLowerCase());

    if (filteredResults.length > 0) {
      dbItem = filteredResults[0] ?? {};
    }
  }

  if (query.id !== undefined) {
    item.id = query.id;
  }

  if (query.damage !== undefined) {
    item.Damage = query.damage;
  }

  if (query.name !== undefined) {
    item.tag.display = { Name: query.name };
  }

  if ("item_id" in dbItem) {
    item.id = dbItem.item_id;
  }

  if ("damage" in dbItem) {
    item.Damage = dbItem.damage;
  }

  if ("name" in dbItem) {
    item.tag.display = { Name: dbItem.name };
  }

  if ("id" in dbItem) {
    item.tag.ExtraAttributes.id = dbItem.id;
  }

  return item;
}
