import "./index.css";
import "./fonts";
import { Composition, Folder } from "remotion";
import { SersanFilm } from "./SersanFilm";
import { TOTAL_FRAMES } from "./timeline";
import { World } from "./World";
import { Lab } from "./Lab";

const W = 1920;
const H = 1080;
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SersanFilm" component={SersanFilm} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Folder name="Lab">
      <Composition id="World" component={World} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
      <Composition id="Lab" component={Lab} durationInFrames={150} fps={FPS} width={W} height={H} />
    </Folder>
  </>
);