import { Throttle } from '@nestjs/throttler';
import { BadRequestException,Body,Controller,Get,Param,ParseUUIDPipe,Post,Put,Query,Req,UseGuards } from '@nestjs/common';
import { AuthGuard,type AuthRequest } from '../auth/auth.guard';
import { WorkoutService } from './workout.service';
import { writeSchema } from './workout.schema';
@Controller('workouts') @UseGuards(AuthGuard)
export class WorkoutController {
 constructor(private readonly service:WorkoutService){}
 @Get() list(@Req() r:AuthRequest,@Query('offset') offset='0'){if(!/^\d{1,6}$/.test(offset))throw new BadRequestException();return this.service.list(r.session.userId,Number(offset));}
 @Get('active') active(@Req() r:AuthRequest){return this.service.active(r.session.userId);}
 @Get('history/:exerciseId') history(@Req() r:AuthRequest,@Param('exerciseId') id:string){return this.service.history(r.session.userId,id);}
 @Get('blocks/:id') block(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.block(r.session.userId,id);}
 @Post('blocks/:id/extend') extend(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.extend(r.session.userId,id);}
 @Throttle({default:{limit:5,ttl:60000}})
 @Post(':id/analysis') analyze(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.analyze(r.session.userId,id);}
 @Post(':id/apply-analysis') apply(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:{revision?:number}){if(!Number.isInteger(body?.revision))throw new BadRequestException();return this.service.applyAnalysis(r.session.userId,id,body.revision!);}
 @Get(':id') get(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.get(r.session.userId,id);}
 @Put(':id') save(@Req() r:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){const p=writeSchema.safeParse(body);if(!p.success)throw new BadRequestException('Données de séance invalides.');return this.service.save(r.session.userId,id,p.data);}
}
