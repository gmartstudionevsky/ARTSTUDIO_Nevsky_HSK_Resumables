type SequenceClient = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
  $queryRawUnsafe: <T>(query: string) => Promise<T>;
};

export async function generateNextItemCode(client: SequenceClient): Promise<string> {
  await client.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS item_code_seq START 1');
  const result = (await client.$queryRawUnsafe<{ nextval: bigint }[]>('SELECT nextval(\'item_code_seq\')'))[0];
  const value = Number(result.nextval);
  return `ITM-${value.toString().padStart(6, '0')}`;
}
