import { BadRequestException } from '@nestjs/common';

export const avatarPlatforms = {
  game_boy: 'original monochrome Game Boy handheld',
  game_boy_color: 'Game Boy Color handheld',
  nes: 'NES 8-bit home console',
  snes: 'SNES 16-bit home console',
  mega_drive: 'Mega Drive 16-bit home console',
  arcade: 'classic arcade cabinet',
  playstation_1: 'original PlayStation low-poly era',
  nintendo_64: 'Nintendo 64 low-poly era',
  dreamcast: 'Dreamcast late-1990s 3D era',
  gamecube: 'GameCube 3D era',
  playstation_2: 'PlayStation 2 3D era',
  xbox_360: 'Xbox 360 HD era',
  nintendo_ds: 'Nintendo DS dual-screen handheld era',
  psp: 'PSP portable 3D era',
  wii: 'Wii colorful 3D era',
  switch: 'Nintendo Switch modern hybrid-console era',
  playstation_4: 'PlayStation 4 modern 3D era',
  playstation_5: 'PlayStation 5 current-generation 3D era',
  xbox_series: 'Xbox Series current-generation 3D era',
  pc: 'modern PC game art',
} as const;

export const avatarGenres = {
  rpg: 'fantasy role-playing game',
  jrpg: 'Japanese role-playing game',
  tactical_rpg: 'tactical role-playing game',
  action_adventure: 'action-adventure game',
  platformer: 'platform game',
  fighting: 'fighting game',
  boxing: 'boxing game',
  sports: 'sports game',
  racing: 'racing game',
  shooter: 'shooter game',
  strategy: 'strategy game',
  stealth: 'stealth game',
  survival: 'survival game',
  horror: 'horror game',
  roguelike: 'roguelike game',
  simulation: 'simulation game',
  cozy: 'cozy life-simulation game',
  rhythm: 'rhythm game',
  sci_fi: 'science-fiction game',
  cyberpunk: 'cyberpunk game',
  post_apocalyptic: 'post-apocalyptic game',
  superhero: 'superhero game',
  pirate: 'pirate-adventure game',
  western: 'western game',
} as const;

export const avatarArtStyles = {
  pixel_art: 'crisp handcrafted pixel art',
  retro_2d: 'retro 2D sprite illustration',
  low_poly: 'stylized low-poly 3D',
  voxel: 'voxel art',
  cel_shading: 'cel-shaded 3D',
  anime: 'anime-inspired illustration',
  comic: 'graphic-novel comic illustration',
  hand_painted: 'hand-painted game concept art',
  isometric: 'isometric game character illustration',
  stylized_3d: 'polished stylized 3D game character',
  realistic_3d: 'realistic 3D game character',
  clay: 'soft clay-like 3D',
  watercolor: 'watercolor game illustration',
} as const;

export type AvatarPreferences = {
  platform: keyof typeof avatarPlatforms;
  genre: keyof typeof avatarGenres;
  artStyle: keyof typeof avatarArtStyles;
};

export const defaultAvatarPreferences: AvatarPreferences = {
  platform: 'playstation_5', genre: 'rpg', artStyle: 'stylized_3d',
};

export function parseAvatarPreferences(input: { platform?: string; genre?: string; artStyle?: string }): AvatarPreferences {
  const platform = input.platform ?? defaultAvatarPreferences.platform;
  const genre = input.genre ?? defaultAvatarPreferences.genre;
  const artStyle = input.artStyle ?? defaultAvatarPreferences.artStyle;
  if (!Object.hasOwn(avatarPlatforms, platform) || !Object.hasOwn(avatarGenres, genre) || !Object.hasOwn(avatarArtStyles, artStyle))
    throw new BadRequestException('Choisis une console, un univers et un style proposés.');
  return { platform: platform as AvatarPreferences['platform'], genre: genre as AvatarPreferences['genre'], artStyle: artStyle as AvatarPreferences['artStyle'] };
}

export function avatarPrompt(preferences: AvatarPreferences) {
  return `Use the attached photo as the identity reference. Create a single video-game character portrait of this same person, framed from the chest up, facing the camera, centered in a square composition that remains readable as a small circular profile picture. Preserve recognizable facial features, skin tone, hairstyle, age and gender presentation. Visual direction: ${avatarPlatforms[preferences.platform]}. Game genre and setting: ${avatarGenres[preferences.genre]}. Art direction: ${avatarArtStyles[preferences.artStyle]}. Combine these choices into one coherent image; prioritize the chosen art direction, using the console era for palette, texture and visual fidelity cues. Give the person a confident, friendly expression and genre-appropriate outfit. Keep the background simple. No text, logos, existing game characters, recognizable franchise costumes, helmets, masks, extra people or drastic change of identity.`;
}
