import { BadRequestException, Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { DailyService } from './daily.service';
import { dailyDataSchema, dailyWriteSchema, timezoneSchema } from './daily.schema';
function parse<T>(schema:z.ZodType<T>,value:unknown):T { const result=schema.safeParse(value);if(!result.success)throw new BadRequestException('Vérifie les informations du bilan.');return result.data; }
@Controller('daily') @UseGuards(AuthGuard)
export class DailyController {
 constructor(private readonly daily:DailyService){}
 @Get() today(@Req() r:AuthRequest,@Query('timezone') tz:unknown){return this.daily.today(r.session.userId,parse(timezoneSchema,tz));}
 @Post('opened') opened(@Req() r:AuthRequest,@Body() body:unknown){const b=parse(z.object({timezone:timezoneSchema}),body);return this.daily.opened(r.session.userId,b.timezone);}
 @Put() save(@Req() r:AuthRequest,@Body() body:unknown){return this.daily.save(r.session.userId,parse(dailyWriteSchema,body));}
 @Post('proposal') proposal(@Req() r:AuthRequest,@Body() body:unknown){const b=parse(z.object({timezone:timezoneSchema,data:dailyDataSchema}),body);return this.daily.proposal(r.session.userId,b.timezone,b.data);}
 @Put('device') device(@Req() r:AuthRequest,@Body() body:unknown){const b=parse(z.object({timezone:timezoneSchema,token:z.string().max(250).nullable()}),body);return this.daily.device(r.session.userId,r.session.tokenHash,b.timezone,b.token);}
}
