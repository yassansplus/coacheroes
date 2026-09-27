export const avatarPlatforms = [
  { value: 'game_boy', label: 'Game Boy' },
  { value: 'game_boy_color', label: 'Game Boy Color' },
  { value: 'nes', label: 'NES' },
  { value: 'snes', label: 'Super Nintendo' },
  { value: 'mega_drive', label: 'Mega Drive' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'playstation_1', label: 'PlayStation 1' },
  { value: 'nintendo_64', label: 'Nintendo 64' },
  { value: 'dreamcast', label: 'Dreamcast' },
  { value: 'gamecube', label: 'GameCube' },
  { value: 'playstation_2', label: 'PlayStation 2' },
  { value: 'xbox_360', label: 'Xbox 360' },
  { value: 'nintendo_ds', label: 'Nintendo DS' },
  { value: 'psp', label: 'PSP' },
  { value: 'wii', label: 'Wii' },
  { value: 'switch', label: 'Nintendo Switch' },
  { value: 'playstation_4', label: 'PlayStation 4' },
  { value: 'playstation_5', label: 'PlayStation 5' },
  { value: 'xbox_series', label: 'Xbox Series' },
  { value: 'pc', label: 'PC' },
] as const;

export const avatarGenres = [
  { value: 'rpg', label: 'RPG fantasy' },
  { value: 'jrpg', label: 'JRPG' },
  { value: 'tactical_rpg', label: 'RPG tactique' },
  { value: 'action_adventure', label: 'Action-aventure' },
  { value: 'platformer', label: 'Plateforme' },
  { value: 'fighting', label: 'Combat' },
  { value: 'boxing', label: 'Boxe' },
  { value: 'sports', label: 'Sport' },
  { value: 'racing', label: 'Course' },
  { value: 'shooter', label: 'Tir' },
  { value: 'strategy', label: 'Stratégie' },
  { value: 'stealth', label: 'Infiltration' },
  { value: 'survival', label: 'Survie' },
  { value: 'horror', label: 'Horreur' },
  { value: 'roguelike', label: 'Roguelike' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'rhythm', label: 'Rythme' },
  { value: 'sci_fi', label: 'Science-fiction' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'post_apocalyptic', label: 'Post-apocalyptique' },
  { value: 'superhero', label: 'Super-héros' },
  { value: 'pirate', label: 'Pirates' },
  { value: 'western', label: 'Western' },
] as const;

export const avatarArtStyles = [
  { value: 'pixel_art', label: 'Pixel art' },
  { value: 'retro_2d', label: 'Sprite 2D rétro' },
  { value: 'low_poly', label: 'Low-poly' },
  { value: 'voxel', label: 'Voxel' },
  { value: 'cel_shading', label: 'Cel-shading' },
  { value: 'anime', label: 'Anime' },
  { value: 'comic', label: 'Comic' },
  { value: 'hand_painted', label: 'Peinture digitale' },
  { value: 'isometric', label: 'Isométrique' },
  { value: 'stylized_3d', label: '3D stylisée' },
  { value: 'realistic_3d', label: '3D réaliste' },
  { value: 'clay', label: '3D pâte à modeler' },
  { value: 'watercolor', label: 'Aquarelle' },
] as const;

export type AvatarPreferences = {
  platform: (typeof avatarPlatforms)[number]['value'];
  genre: (typeof avatarGenres)[number]['value'];
  artStyle: (typeof avatarArtStyles)[number]['value'];
};

export const defaultAvatarPreferences: AvatarPreferences = {
  platform: 'playstation_5', genre: 'rpg', artStyle: 'stylized_3d',
};
