import { Decimal } from "@prisma/client/runtime/library";

import { Prisma } from "@prisma/client";

export async function getOrCreateBalance(tx: Prisma.TransactionClient, inventoryItemId: string, warehouseId: string) {
  return tx.inventoryBalance.upsert({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
    update: {},
    create: {
      inventoryItemId,
      warehouseId,
      quantityOnHand: new Decimal(0),
      inventoryValue: new Decimal(0),
    },
  });
}

export async function receiveInventory(params: {
  tx: Prisma.TransactionClient;
  inventoryItemId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
}) {
  const { tx, inventoryItemId, warehouseId, quantity, unitCost } = params;
  if (quantity <= 0) throw new Error("Receive quantity must be greater than zero");

  const balance = await getOrCreateBalance(tx, inventoryItemId, warehouseId);
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });

  const oldQty = Number(balance.quantityOnHand);
  const oldValue = Number(balance.inventoryValue);
  const incomingValue = quantity * unitCost;

  const newQty = oldQty + quantity;
  const newValue = oldValue + incomingValue;
  const newAverageCost = newQty === 0 ? 0 : newValue / newQty;

  await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: {
      quantityOnHand: new Decimal(newQty),
      inventoryValue: new Decimal(newValue),
    },
  });

  await tx.inventoryItem.update({
  where: { id: item.id },
  data: {
    averageCost: new Decimal(newAverageCost),
    unitCost: new Decimal(unitCost),
  },
});

  return {
    previousQuantity: oldQty,
    newQuantity: newQty,
    previousValue: oldValue,
    newValue,
    averageCost: newAverageCost,
  };
}

export async function issueInventory(params: {
  tx: Prisma.TransactionClient;
  inventoryItemId: string;
  warehouseId: string;
  quantity: number;
}) {
  const { tx, inventoryItemId, warehouseId, quantity } = params;
  if (quantity <= 0) throw new Error("Issue quantity must be greater than zero");

  const balance = await getOrCreateBalance(tx, inventoryItemId, warehouseId);
  const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });

  const oldQty = Number(balance.quantityOnHand);
  const oldValue = Number(balance.inventoryValue);
  const avgCost = Number(item.averageCost);

  if (oldQty < quantity) throw new Error("Insufficient stock for issue");

  const issuedValue = +(quantity * avgCost).toFixed(4);
  const newQty = oldQty - quantity;
  const newValue = +(oldValue - issuedValue).toFixed(4);

  await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: {
     quantityOnHand: new Decimal(newQty),
     inventoryValue: new Decimal(newValue),
    },
  });

  return {
    issuedQuantity: quantity,
    unitCost: avgCost,
    issuedValue,
    remainingQuantity: newQty,
    remainingValue: newValue,
  };
}

export async function inventoryValuationReport(tx: Prisma.TransactionClient | any, companyId: string) {
  const balances = await tx.inventoryBalance.findMany({
    where: { inventoryItem: { companyId } },
    include: { inventoryItem: true, warehouse: true },
    orderBy: [{ inventoryItem: { name: "asc" } }],
  });

  return balances.map((row: any) => ({
    inventoryItemId: row.inventoryItemId,
    sku: row.inventoryItem.sku,
    itemName: row.inventoryItem.name,
    warehouse: row.warehouse.name,
    quantityOnHand: Number(row.quantityOnHand),
    averageCost: Number(row.inventoryItem.averageCost),
    inventoryValue: Number(row.inventoryValue),
  }));
}
