# Vehicle Light Anchor Analysis

Source: Tesla's official `teslamotors/light-show` project. The app now uses the official 48-channel order from `xlights/show_folder/tesla_xlights_show_folder/Tesla Model S.xmodel`, padded with two reserved channels because Tesla's validator requires 48 or 200 channels. Model 3/Y headlight behavior follows the README section "Light Channel Locations":

- Outer Main Beam, Inner Main Beam, Signature, Channels 4-6, Front Turn, Front Fog, Aux Park, and Side Marker are separate logical channels.
- On Model 3/Y, Channels 4-6 are OR'ed into one physical output per side.
- On Model 3/Y, Left/Right Aux Park and Left/Right Side Marker operate together.
- Rear side markers are represented through side repeater activation.

## Model Y Images

| Image | Visible vehicle side | Anchored lights |
| --- | --- | --- |
| `tesla-model-y-black-with-interior-01.jpg` | Front view | Left/right main beams, signatures, front turns, front fogs, aux/side marker strip |
| `tesla-model-y-black-with-interior-02.jpg` | Right front three-quarter | Far left headlamp, right headlamp, right front turn, right fog/aux strip, right side repeater, right tail/brake/rear turn |
| `tesla-model-y-black-with-interior-03.jpg` | Right side | Right headlamp edge, right side repeater, right tail/brake/rear turn, reverse segment, rear side marker via side repeater |
| `tesla-model-y-black-with-interior-04.jpg` | Rear three-quarter | Left/right tail, brake, rear turns, reverse segments, license plate light, lower rear fog positions |
| `tesla-model-y-black-with-interior-05.jpg` | Left front three-quarter | Left headlamp, left front turn, left fog/aux strip, left side repeater, left tail/brake/rear turn |
| `tesla-model-y-black-with-interior-06.jpg` | Front close view | Left/right main beams, signatures, front turns, front fogs, aux/side marker strip |
| `tesla-model-y-black-with-interior-07.jpg` | Right front high angle | Far left headlamp edge, right headlamp, right front turn, right fog/aux strip, right side repeater, right tail/brake/rear turn |

## Model 3 Images

| Image | Visible vehicle side | Anchored lights |
| --- | --- | --- |
| `tesla-3-01.jpg` | Right front three-quarter | Far left headlamp, right headlamp/signature/front turn, right side repeater, right tail/brake/rear turn |
| `tesla-3-04.jpg` | Rear three-quarter | Right side repeater, left/right tail, brake, rear turns, license plate light, lower rear fog positions |
| `tesla-3-11.jpg` | Right high angle | Right tail/rear turn, right side repeater, right headlamp/signature/front turn |
| `tesla-3-13.jpg` | Right side | Right headlamp/signature/front turn, right side repeater, right tail/brake/rear turn, reverse segment |
| `tesla-3-14.jpg` | Rear view | Left/right tail, brake, rear turns, reverse segments, license plate light, lower rear fog positions |
| `tesla-3-15.jpg` | Front view | Left/right main beams, signatures, front turns |
