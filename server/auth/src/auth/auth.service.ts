import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs'
import {catchError, firstValueFrom, lastValueFrom, switchMap} from 'rxjs';
import { TokensService } from 'src/tokens/tokens.service';

@Injectable()
export class AuthService {
  constructor(
  @Inject('USERS-SERVICE') private readonly userService: ClientProxy,
  private tokenService: TokensService) {}

  async login(userDto: LoginDto | any, response, skipPasswordCheck: boolean = false) {
    // response получим уже в main
    
    const hashedPassword = bcrypt.hash(userDto.password, process.env.SALT);
    const user = await this.defineUserExists(userDto.email);
    const userPassword = user?.password;
    const isRightPassword = (hashedPassword == userPassword);

    if (!isRightPassword && !skipPasswordCheck) {
      throw new BadRequestException("Invalid credentials");
    }
    // return await this.tokenService.generateAndSaveToken({...userDto}, response)
  }

  async defineUserExists(email: string) : Promise<any> {
    const user$ = this.userService.send( {cmd: 'get-user-by-email' }, email ).pipe(
      switchMap((user) => { 
        if (user) return user;
      }),
      catchError( (error) => {
        console.log(error)
        throw new BadRequestException;
      })
    );
    const user = await firstValueFrom(user$);
    return (user)? user : null;
  }

  async registration(userDto: LoginDto) {
    console.log('TEST: ', userDto)
    // response получим уже в main

    const hashedPassword = bcrypt.hash(userDto.password, process.env.SALT);

    if (await this.defineUserExists(userDto.email)) {
      throw new HttpException(`Пользователь с таким e-mail уже существует`, HttpStatus.NOT_FOUND);
    }

    // const id$ = this.userService.send( {cmd: 'create-user'}, {...userDto, password: hashedPassword}).pipe(
    //   switchMap((id) => {
    //     return id
    //   })
    // )
    // const id = +await firstValueFrom(id$);

    // Просто оставлю в таком виде, работает точно так же, как функция выше.
    const test =await lastValueFrom(this.userService.send( {cmd: 'create-user'}, {email: userDto.email, password: hashedPassword}))

    // createProfile(userDto)

    return await this.tokenService.generateAndSaveToken({email: userDto.email, id: test, roles: []})
  }

  async logout(refreshToken, response) {
    await this.tokenService.removeToken(refreshToken, response);
  }
}
