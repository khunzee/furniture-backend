import { faker } from "@faker-js/faker";
import prisma from "../src/lib/prisma";
import * as bcrypt from "bcrypt";

const createRandomUsers = () => ({
  phone: faker.phone.number({ style: "international" }),
  password: "",
  randToken: faker.internet.jwt(),
});

export const userData = faker.helpers.multiple(createRandomUsers, { count: 5 });

async function main() {
  console.log("Start seeding ....");
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("123456", salt);

  for (const u of userData) {
    u.password = password;
    await prisma.user.create({
      data: u,
    });
  }
  console.log("Seeding finished...");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
