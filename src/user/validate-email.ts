import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

const HUNTER_API_KEY = 'your-hunter-io-api-key'; // Put this in env in real apps

const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

export async function validateEmailFlow(
  email: string,
  userRepository: Repository<User>,
): Promise<void> {
  // 1. Format validation
  if (!emailRegex.test(email)) {
    throw new UnauthorizedException('Invalid email format');
  }

  // 2. Check in DB
  const user = await userRepository.findOne({ where: { email } });
  if (user) {
    throw new UnauthorizedException('Email already exists');
  }

  // 3. Check real-life validity via Hunter.io
  const response = await axios.get(
    `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${HUNTER_API_KEY}`,
  );

  const data = response.data?.data;
  if (!data || data.result === 'undeliverable') {
    throw new UnauthorizedException('Email is invalid or undeliverable');
  }
}
