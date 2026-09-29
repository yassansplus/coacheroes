const { withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist').default;

/** Registered before expo-widgets so its Xcode mod executes after the extension exists. Fonts live in the extension bundle as well as the main app. */
module.exports = config => withXcodeProject(config, config => {
  const project = config.modResults;
  const entry = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) => !key.endsWith('_comment') && String(value.name).replaceAll('"', '') === 'ExpoWidgetsTarget');
  if (!entry) throw new Error('Register with-widget-fonts before expo-widgets (Expo executes Xcode mods in reverse order).');
  const [target, nativeTarget] = entry;
  IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'Resources');
  const phases = project.hash.project.objects.PBXResourcesBuildPhase || {};
  if (!nativeTarget.buildPhases.some(phase => phases[phase.value])) project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target);
  const dir = path.join(config.modRequest.platformProjectRoot, 'ExpoWidgetsTarget');
  const fonts = ['500Medium/Montserrat_500Medium.ttf', '700Bold/Montserrat_700Bold.ttf'];
  for (const font of fonts) {
    const name = path.basename(font);
    const source = require.resolve(`@expo-google-fonts/montserrat/${font}`, { paths: [config.modRequest.projectRoot] });
    fs.copyFileSync(source, path.join(dir, name));
    const resource = `ExpoWidgetsTarget/${name}`;
    if (!project.hasFile(resource)) {
      const file = project.addResourceFile(resource, { target });
      const reference = project.pbxFileReferenceSection()[file.fileRef];
      reference.lastKnownFileType = 'file';
      delete reference.fileEncoding;
      delete reference.explicitFileType;
    }
  }
  const infoPath = path.join(dir, 'Info.plist');
  const info = plist.parse(fs.readFileSync(infoPath, 'utf8'));
  info.UIAppFonts = [...new Set([...(info.UIAppFonts || []), ...fonts.map(file => path.basename(file))])];
  fs.writeFileSync(infoPath, plist.build(info));
  return config;
});
