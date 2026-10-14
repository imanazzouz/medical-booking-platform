import argon2 from "argon2";

const options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const passwordHasher = {
  hash: (password: string) => argon2.hash(password, options),
  verify: (hash: string, password: string) => argon2.verify(hash, password, options),
};
