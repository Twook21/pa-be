const { PrismaClient } = require('./generated/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'akmalbintang33@gmail.com' } });
  console.log(user);
}
run();
