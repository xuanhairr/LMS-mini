import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SEEDING ROLES ---");

  const roles = [
    { value: "STUDENT", label: "Sinh viên", color: "blue" },
    { value: "TEACHER", label: "Giảng viên", color: "cyan" },
    { value: "STAFF", label: "Giáo vụ", color: "purple" },
    { value: "HEAD_STAFF", label: "Giáo vụ trưởng", color: "orange" },
    { value: "ADMIN", label: "Quản trị viên", color: "red" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { value: role.value },
      update: { label: role.label, color: role.color },
      create: role,
    });
    console.log(`Upserted role: ${role.value}`);
  }

  console.log("--- SEEDING ROLES COMPLETED ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
