import { genSalt, hash, compare } from 'bcryptjs';

interface IBcryptParams {
  salt?: string | number;
  source: string;
}

interface ICompareParams {
  source: string;
  target: string;
}

function generateSalt(characterNumber = 10): Promise<string> {
  return genSalt(characterNumber);
}

export async function generateWithBcrypt({
  salt,
  source,
}: IBcryptParams): Promise<string> {
  salt = salt || (await generateSalt());

  const generatedHash = await hash(source, salt);

  return generatedHash;
}

export async function compareWithBcrypt({
  source,
  target,
}: ICompareParams): Promise<boolean> {
  try {
    const result = await compare(source, target);
    return result;
  } catch (error) {
    console.error('Error in password comparison:', error);
    return false;
  }
}
