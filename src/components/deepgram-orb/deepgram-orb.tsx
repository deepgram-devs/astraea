import { Component, Prop, State, h } from '@stencil/core';
import { VoiceBotStatus } from '../enums';

interface Point {
  x: number;
  y: number;
}

interface ColorStop {
  pct: number;
  color: string;
}

type NonEmptyArray<T> = [T, ...T[]];

interface LineConfig {
  segments: NonEmptyArray<ColorStop>;
  startAngle: number;
  speedMultiplier: number;
  centerOffset: Point;
  radiusOffset: number;
  width: number;
}

interface Deflation {
  angle: number;
  depth: number;
}

interface Shape {
  generation: number;
  time: number;
  // multiplier that controls the progress of time
  speed: number;
  deflation: number;
  rockingAngle: number;
  agentNoise: number[];
  userNoise: number[];
  end: boolean;
}

type Context = CanvasRenderingContext2D;

enum Color {
  springGreen = '#13ef93cc',
  magenta = '#ee028ccc',
  lightPurple = '#ae63f9cc',
  lightBlue = '#14a9fbcc',
  green = '#a1f9d4cc',
  darkBlue = '#4b3cffcc',
  purple = '#dd0070cc',
  transparent = 'transparent',
}

/**
 * These were picked from a bakeoff of some random color configs
 * and then added onto with the help of our automation overlords
 */
const lines: LineConfig[] = [
  {
    segments: [
      { pct: 0.42, color: Color.transparent },
      { pct: 0.61, color: Color.magenta },
    ],
    startAngle: 3.52,
    speedMultiplier: 1.21,
    centerOffset: {
      x: 0.01,
      y: -0.01,
    },
    radiusOffset: 0.02,
    width: 3.38,
  },
  {
    segments: [
      { pct: 0.28, color: Color.springGreen },
      { pct: 0.62, color: Color.magenta },
      { pct: 0.8, color: Color.transparent },
    ],
    startAngle: 1.59,
    speedMultiplier: 0.64,
    centerOffset: {
      x: -0.03,
      y: -0.01,
    },
    radiusOffset: 0.05,
    width: 2.39,
  },
  {
    segments: [
      { pct: 0.1, color: Color.transparent },
      { pct: 0.31, color: Color.green },
      { pct: 0.45, color: Color.lightBlue },
      { pct: 0.66, color: Color.lightPurple },
    ],
    startAngle: 2.86,
    speedMultiplier: 0.94,
    centerOffset: {
      x: 0.02,
      y: 0.02,
    },
    radiusOffset: -0.06,
    width: 2.64,
  },
  {
    segments: [
      { pct: 0.1, color: Color.lightPurple },
      { pct: 0.5, color: Color.transparent },
      { pct: 0.9, color: Color.green },
    ],
    startAngle: 5.67,
    speedMultiplier: 1.3,
    centerOffset: {
      x: -0.01,
      y: 0.01,
    },
    radiusOffset: 0.04,
    width: 2.95,
  },
];

const LINE_COUNT = lines.length;

@Component({
  tag: 'deepgram-orb',
  shadow: true,
})
export class DeepgramOrb {
  /**
   * The state of the orb.
   */
  @Prop() orbState: VoiceBotStatus = VoiceBotStatus.NotStarted;

  /**
   * The volume of the agent.
   */
  @Prop() agentVolume: number = 0;
  /**
   * The volume of the user.
   */
  @Prop() userVolume: number = 0;

  /**
   * The size of the orb.
   */
  @Prop() size: number = 100;

  /**
   * The period for the constant pulsing when the agent is on.
   */
  @Prop() pulsePeriodSeconds = 3;

  /**
   * How much larger/smaller than "normal" size (as a percentage) the pulse gets.
   */
  @Prop() pulseSizeMultiplier = 1.02;

  /**
   * The speed at which the colors move along their lines. A "period" is the time
   * to return to their original position. Divide by the current state's time
   * speed for actual rotation period.
   */
  @Prop() averageRotationPeriodSeconds = 6;

  /**
   * the "base" rocking period. Divide by the current state's time speed for
   * actual rocking period.
   */
  @Prop() rockingPeriodSeconds = 3;

  /**
   * Total transition time when switching max rocking angle.
   */
  @Prop() rockingTransitionTimeMs = 1000;

  /**
   * How far down to deflate (in radii) in the maximum state.
   */
  @Prop() deflatePull = 2;

  /**
   * Total transition time when deflating.
   */
  @Prop() deflateTransitionTimeMs = 1000;

  /**
   * Total transition time when inflating.
   */
  @Prop() inflateTransitionTimeMs = 300;

  /**
   * How much to increase/decrease the circle size when "chattering".
   */
  @Prop() chatterSizeMultiplier = 1.15;

  /**
   * How many frames to use when calculating the chatter effect for a line.
   * Larger windows have a smoothing effect.
   */
  @Prop() chatterWindowSize = 3;

  /**
   * When "chattering", the number of frames it takes for one line to catch up to
   * the next.
   */
  @Prop() chatterFrameLag = 5;

  /**
   * Multiplier to adjust the width of all lines. A value of 1 means default width,
   * values less than 1 will make lines thinner, and values greater than 1 will make them thicker.
   */
  @Prop() lineWidthMultiplier = 1;

  /**
   * Display circles at arc endpoints, bottom of animation, and center.
   */
  @Prop() debug = false;

  @State() shape: Shape;

  private canvas: HTMLCanvasElement;

  componentWillLoad() {
    this.initializeShape();
  }

  componentDidLoad() {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      const now = performance.now();
      requestAnimationFrame(t => {
        if (this.shape) this.draw(ctx, this.shape, now, t);
      });
    }
  }

  disconnectedCallback() {
    this.shape.end = true;
  }

  /**
   * Initializes the shape of the orb.
   */
  private initializeShape() {
    this.shape = {
      generation: 0,
      time: 0,
      speed: this.speedOf(this.orbState),
      rockingAngle: this.rockingAngle(this.orbState),
      deflation: this.deflationDepth(this.orbState),
      agentNoise: Array(LINE_COUNT * this.chatterFrameLag + this.chatterWindowSize).fill(this.agentVolume),
      userNoise: Array(LINE_COUNT * this.chatterFrameLag + this.chatterWindowSize).fill(this.userVolume),
      end: false,
    };
  }

  /**
   * Calculates the pi value of a given number.
   * @param n - The number to calculate the pi value of.
   * @returns The pi value of the given number.
   */
  private pi(n: number): number {
    return Math.PI * n;
  }

  /**
   * Calculates the coordinates of a point from a given distance and angle.
   * @param point - The starting point.
   * @param distance - The distance to the point.
   * @param angle - The angle to the point.
   * @returns The coordinates of the point.
   */
  private coordsFrom({ x, y }: Point, distance: number, angle: number): Point {
    return {
      x: x + distance * Math.cos(angle),
      y: y + distance * Math.sin(angle),
    };
  }

  /**
   * Draws a cubic Bezier curve on the canvas.
   * @param ctx - The canvas context.
   * @param cp1 - The first control point.
   * @param cp2 - The second control point.
   * @param end - The ending point.
   */
  private bezier(ctx: Context, cp1: Point, cp2: Point, end: Point): void {
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }

  /**
   * Draws a circle on the canvas.
   * @param ctx - The canvas context.
   * @param center - The center of the circle.
   * @param r - The radius of the circle.
   */
  private circle(ctx: Context, center: Point, r: number): void {
    ctx.ellipse(center.x, center.y, r, r, 0, 0, this.pi(2));
  }

  /**
   * Linearly interpolates between two values.
   * @param start - The starting value.
   * @param stop - The stopping value.
   * @param amt - The amount to interpolate.
   * @returns The interpolated value.
   */
  private lerp(start: number, stop: number, amt: number): number {
    return amt * (stop - start) + start;
  }

  /**
   * Clamps a value between a low and high boundary.
   * @param bounds - The bounds to clamp the value between.
   * @param val - The value to clamp.
   * @returns The clamped value.
   */
  private clamp({ low, high }: { low: number; high: number }, val: number): number {
    return Math.min(high, Math.max(val, low));
  }

  /**
   * https://easings.net/#easeInOutQuad
   */
  private easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  }

  /**
   * Gets the center of the canvas.
   * @param ctx - The canvas context.
   * @returns The center of the canvas.
   */
  private getCenter(ctx: Context): Point {
    const { width, height } = ctx.canvas.getBoundingClientRect();

    return {
      x: width / 2,
      y: height / 2,
    };
  }

  /**
   * Draws a crescent shape on the canvas.
   * @param ctx - The canvas context.
   * @param offset - The offset of the crescent.
   * @param radius - The radius of the crescent.
   * @param deflation - The deflation of the crescent.
   * @param strokeStyle - The stroke style of the crescent.
   */
  private crescent(
    ctx: Context,
    offset: Point,
    radius: number,
    deflation: Deflation,
    strokeStyle: CanvasGradient,
  ): void {
    /**
     * to approximate a circle segment, the two control points of a bezier curve
     * need to be at a specific distance, represented by
     *
     * circleRadius * (4 / 3) * Math.tan(Math.PI / (2 * n))
     *
     * where n is # of segments in a full circle. the angle for that distance is
     * simply "tangential to the arc at the closest endpoint"
     */
    const bezierDistance = radius * (4 / 3) * Math.tan(this.pi(1 / 8));

    const trueCenter = this.getCenter(ctx);
    const center = {
      x: trueCenter.x * (1 + offset.x),
      y: trueCenter.y * (1 + offset.y),
    };
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();

    // the "true circle" part
    const arcStart = deflation.angle + this.pi(1 / 2);
    const arcEnd = deflation.angle + this.pi(3 / 2);
    ctx.arc(center.x, center.y, radius, arcStart, arcEnd, false);

    // the "deflatable" part. two bezier curves each approximating a quarter-circle
    const start = this.coordsFrom(center, radius, arcEnd);
    const angleTowardsXAxis = this.pi(3 / 2) - deflation.angle;
    const distanceDownToXAxis = Math.cos(angleTowardsXAxis) * radius;
    const mid = this.coordsFrom(
      this.coordsFrom(center, radius, deflation.angle), // where the point would be with no deflation
      distanceDownToXAxis * deflation.depth * this.deflatePull,
      this.pi(1 / 2),
    );

    const end = this.coordsFrom(center, radius, arcStart);

    /**
     * The way to find a control point is to take that distance from the equation
     * above, and move "tangential to the circle at the closer endpoint"
     */
    const bez1 = {
      cp1: this.coordsFrom(start, bezierDistance, arcEnd + this.pi(1 / 2)),
      cp2: this.coordsFrom(mid, bezierDistance, deflation.angle + this.pi(3 / 2)),
    };
    const bez2 = {
      cp1: this.coordsFrom(mid, bezierDistance, deflation.angle + this.pi(1 / 2)),
      cp2: this.coordsFrom(end, bezierDistance, arcStart + this.pi(3 / 2)),
    };

    this.bezier(ctx, bez1.cp1, bez1.cp2, mid);
    this.bezier(ctx, bez2.cp1, bez2.cp2, end);
    ctx.stroke();
    if (this.debug) {
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      this.circle(ctx, center, 5);
      ctx.stroke();
      ctx.beginPath();
      this.circle(ctx, this.coordsFrom(center, radius, arcStart), 5);
      ctx.stroke();
      ctx.beginPath();
      this.circle(ctx, this.coordsFrom(center, radius, arcEnd), 5);
      ctx.stroke();
      ctx.beginPath();
      this.circle(ctx, this.coordsFrom(center, radius, (arcStart + arcEnd) / 2), 5);
      ctx.stroke();
      ctx.beginPath();
      this.circle(ctx, mid, 5);
      ctx.stroke();
    }
  }

  /**
   * Creates a linear gradient for the orb.
   * @param ctx - The canvas context.
   * @param offset - The offset of the gradient.
   * @param angle - The angle of the gradient.
   * @param parts - The parts of the gradient.
   * @returns The gradient.
   */
  private makeGradient(ctx: Context, offset: Point, angle: number, parts: ColorStop[]): CanvasGradient {
    const center = this.getCenter(ctx);
    const x1 = center.x * (1 - Math.cos(angle) + offset.x);
    const y1 = center.y * (1 - Math.sin(angle) + offset.y);
    const x2 = center.x * (1 + Math.cos(angle) + offset.x);
    const y2 = center.y * (1 + Math.sin(angle) + offset.y);
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    parts.forEach(({ pct, color }: ColorStop) => {
      g.addColorStop(pct, color);
    });

    return g;
  }

  /**
   * Calculates the radius oscillation of the orb.
   * @param shape - The current shape of the orb.
   * @returns The radius oscillation of the orb.
   */
  private radiusOscillation(shape: Shape): number {
    return (
      1 +
      (this.pulseSizeMultiplier - 1) *
        Math.sin((shape.time * this.pi(1)) / this.pulsePeriodSeconds / 1000) *
        this.lerp(1, 0, shape.deflation)
    );
  }

  /**
   * Calculates the rolling average of the noise array.
   * @param noise - The noise array.
   * @param start - The starting index of the noise array.
   * @returns The rolling average of the noise array.
   */
  private rollingAverage(noise: number[], start: number): number {
    const noiseWindow = noise.slice(start, start + this.chatterWindowSize);
    return noiseWindow.reduce((a, b) => a + b) / noiseWindow.length;
  }

  /**
   * Simulates the speech state of the orb.
   * @param shape - The current shape of the orb.
   * @param start - The starting index of the noise array.
   * @returns The adjusted speech state.
   */
  private speechSimulation(shape: Shape, start: number): number {
    return this.lerp(1, this.chatterSizeMultiplier, this.rollingAverage(shape.agentNoise, start));
  }

  /**
   * Simulates the listening state of the orb.
   * @param shape - The current shape of the orb.
   * @param start - The starting index of the noise array.
   * @returns The adjusted listening state.
   */
  private listeningSimulation(shape: Shape, start: number): number {
    return this.lerp(1, 1 / this.chatterSizeMultiplier, this.rollingAverage(shape.userNoise, start));
  }

  /**
   * Adjusts the given line width by the lineWidthMultiplier prop.
   * @param baseWidth - The original width of the line.
   * @returns The adjusted line width.
   */
  private adjustLineWidth(baseWidth: number): number {
    return baseWidth * this.lineWidthMultiplier;
  }

  draw = (ctx: Context, shape: Shape, last: number, now: number): void => {
    if (shape.end) return;
    // eslint-disable-next-line no-param-reassign
    shape.time += (now - last) * this.lerp(1, shape.speed, shape.deflation);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.filter = 'saturate(100%)';

    const center = this.getCenter(ctx);
    const maxRadius = Math.min(center.x, center.y);

    lines.forEach((line, i) => {
      ctx.lineWidth = this.adjustLineWidth(line.width);
      ctx.shadowColor = line.segments[0].color;
      ctx.shadowBlur = this.adjustLineWidth(line.width) * 1.1;
      const radius =
        maxRadius *
        0.8 *
        this.speechSimulation(shape, i * this.chatterFrameLag) *
        this.listeningSimulation(shape, i * this.chatterFrameLag) *
        this.radiusOscillation(shape);
      const gradient = this.makeGradient(
        ctx,
        line.centerOffset,
        line.startAngle + ((shape.time * this.pi(1)) / 1000 / this.averageRotationPeriodSeconds) * line.speedMultiplier,
        line.segments,
      );
      this.crescent(
        ctx,
        line.centerOffset,
        radius + line.radiusOffset * radius,
        {
          depth: this.easeInOutQuad(shape.deflation),
          angle:
            this.pi(3 / 2) +
            Math.sin((shape.time * this.pi(2)) / this.rockingPeriodSeconds / 1000) * shape.rockingAngle,
        },
        gradient,
      );
    });

    requestAnimationFrame(t => {
      this.draw(ctx, shape, now, t);
    });
  };

  // How completely to deflate.
  private deflationDepth(orbState: string): number {
    switch (orbState) {
      case VoiceBotStatus.Active:
        return 0;
      case VoiceBotStatus.Sleeping:
        return 0.65;
      case VoiceBotStatus.NotStarted:
        return 1;
      default:
        return 0;
    }
  }

  // How far (in radians) to tip in each direction.
  private rockingAngle(orbState: string): number {
    switch (orbState) {
      case VoiceBotStatus.Active:
        return this.pi(1 / 15);
      case VoiceBotStatus.Sleeping:
        return this.pi(1 / 15);
      case VoiceBotStatus.NotStarted:
        return this.pi(1 / 2);
      default:
        return this.pi(1 / 15);
    }
  }

  // How quickly time moves forward. 1 means "1 second per real second", 0.5 means "1 second per 2 real seconds".
  private speedOf(orbState: string): number {
    switch (orbState) {
      case VoiceBotStatus.Active:
        return 1;
      case VoiceBotStatus.Sleeping:
        return 0.5;
      case VoiceBotStatus.NotStarted:
        return 0.2;
      default:
        return 1;
    }
  }

  transition = (
    generation: number,
    start: { time: number; deflation: number; rockingAngle: number },
    end: { deflation: number; rockingAngle: number },
    shape: Shape,
    now: number = start.time,
  ) => {
    // drop this transition if a newer one has been produced
    if (shape.generation > generation) return;

    if (end.deflation !== shape.deflation) {
      const transitionTime =
        end.deflation > start.deflation ? this.deflateTransitionTimeMs : this.inflateTransitionTimeMs;
      const progress = this.easeInOutQuad(this.clamp({ low: 0, high: 1 }, (now - start.time) / transitionTime));

      // eslint-disable-next-line no-param-reassign
      shape.deflation = progress === 1 ? end.deflation : this.lerp(start.deflation, end.deflation, progress);
    }

    if (end.rockingAngle !== shape.rockingAngle) {
      const progress = this.easeInOutQuad(
        this.clamp({ low: 0, high: 1 }, (now - start.time) / this.rockingTransitionTimeMs),
      );

      // eslint-disable-next-line no-param-reassign
      shape.rockingAngle =
        progress === 1 ? end.rockingAngle : this.lerp(start.rockingAngle, end.rockingAngle, progress);
    }

    if (shape.deflation !== end.deflation || shape.rockingAngle !== end.rockingAngle) {
      requestAnimationFrame(ts => {
        this.transition(generation, start, end, shape, ts);
      });
    }
  };

  render() {
    return <canvas width={this.size} height={this.size} ref={el => (this.canvas = el as HTMLCanvasElement)}></canvas>;
  }
}
