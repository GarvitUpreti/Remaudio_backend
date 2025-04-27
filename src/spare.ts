// if(updateUserDto.playlistToAdd) {
//       if (updateUserDto.playlistToAdd?.length > 0) {
//         const playlistsToAdd = await this.playlistRepository.findBy({
//           id: In(updateUserDto.playlistToAdd),
//         });
    
//         const missingIds = updateUserDto.playlistToAdd.filter(
//           id => !playlistsToAdd.some(playlist => playlist.id === id),
//         );
    
//         if (missingIds.length > 0) {
//           throw new BadRequestException(`playlists not found: ${missingIds.join(', ')}`);
//         }
    
//         const existingplaylistIds = new Set(user.playlists.map(playlist => playlist.id));
//         const uniqueplaylistsToAdd = playlistsToAdd.filter(playlist => !existingplaylistIds.has(playlist.id));
//         user.playlists.push(...uniqueplaylistsToAdd);
//       }
//     }