import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
prisma.user.findUnique({where:{email:'admin@serambiente.com'}}).then(u=>{
  console.log('TOKEN_START');
  console.log('TOKEN_END');
}).finally(()=>prisma.());
