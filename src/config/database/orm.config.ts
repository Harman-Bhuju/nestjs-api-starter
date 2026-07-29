import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './typeorm-options';



export default registerAs('orm.config', (): TypeOrmModuleOptions => {
  return buildTypeOrmOptions();
});