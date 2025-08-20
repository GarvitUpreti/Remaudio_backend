import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/auth/public.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
 
  @Public()
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id/songs')
  async getUserSongs(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserSongs(id);
  }
  @Get(':id/playlists')
  async getUserPlaylists(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserPlaylists(id);
  }

  @Get('id/:id')
  findById(@Param('id') id: number) {
    return this.userService.findById(+id);
  }

  @Public()
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Public()
  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.userService.findByName(name);
  }

  @Public()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // console.log("request reached the backend for patching user")
    // console.log(updateUserDto.playlistToAdd[0])
    return this.userService.update(+id, updateUserDto);
  }
  @Public()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
