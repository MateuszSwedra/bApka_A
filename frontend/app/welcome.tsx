import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Svg, {
  Polygon,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Lekko mniejszy sześciokąt, żeby obrys i animacja nie obcinały górnego wierzchołka. */
const HEX_SIZE = Math.min(SCREEN_WIDTH * 0.68, 320);
/** Padding viewBox w SVG — obrys (stroke) nie jest obcinany u góry/dół. */
const HEX_SVG_PAD = 8;

type Slide = {
  image: any;
  title: string;
  subtitle?: string;
  accentColor: string;
  /** Tło wewnątrz heksa: chłodne (granat) vs ciepłe (akcent pomarańcz) */
  interiorTint: 'cool' | 'warm';
};

const SLIDES: Slide[] = [
  {
    image: require('../assets/images/welcome-senior.png'),
    title: 'Pomoc dla Twojego seniora',
    accentColor: OnboardingPalette.primary,
    interiorTint: 'cool',
  },
  {
    image: require('../assets/images/welcome-phone.png'),
    title: 'Przypomnienia o lekach',
    subtitle: 'i wiele więcej',
    accentColor: OnboardingPalette.accent,
    interiorTint: 'warm',
  },
  {
    image: require('../assets/images/welcome-chart.png'),
    title: 'Śledź postępy podopiecznego',
    accentColor: OnboardingPalette.primaryDark,
    interiorTint: 'cool',
  },
];

const SLIDE_DURATION = 3500;
const BG_COLOR = OnboardingPalette.background;

function hexagonPoints(size: number) {
  // pointy-top hexagon centred at (size/2, size/2)
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function hexagonPathD(size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  let d = '';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return d + 'Z';
}

/**
 * Heksagonalny "frame" z wycentrowana ilustracja. Grafiki maja przezroczyste tlo.
 * Pod spodem — lagodny gradient w srodku heksa (granatowy lub pomaranczowy).
 * Na wierzchu maska evenodd wypelnia rogi kolorem tla ekranu.
 */
function HexagonImage({
  source,
  size,
  bgColor,
  interiorTint,
  imageScale = 0.7,
}: {
  source: any;
  size: number;
  bgColor: string;
  interiorTint: 'cool' | 'warm';
  imageScale?: number;
}) {
  const gradId = React.useRef(
    `hexFill_${Math.random().toString(36).slice(2, 11)}`,
  ).current;
  const outerRect = `M0,0 H${size} V${size} H0 Z`;
  const hex = hexagonPathD(size);
  const imgSize = size * imageScale;
  const offset = (size - imgSize) / 2;
  return (
    <View style={{ width: size, height: size, backgroundColor: 'transparent' }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {interiorTint === 'warm' ? (
            <SvgLinearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor="#E9A43D" stopOpacity={0.16} />
              <Stop offset="42%" stopColor="#E9A43D" stopOpacity={0.09} />
              <Stop offset="100%" stopColor="#E9A43D" stopOpacity={0.025} />
            </SvgLinearGradient>
          ) : (
            <SvgLinearGradient id={gradId} x1="50%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor="#456882" stopOpacity={0.14} />
              <Stop offset="38%" stopColor="#2F5570" stopOpacity={0.09} />
              <Stop offset="100%" stopColor="#1B3C53" stopOpacity={0.035} />
            </SvgLinearGradient>
          )}
        </Defs>
        <Path d={hex} fill={`url(#${gradId})`} />
      </Svg>
      <Image
        source={source}
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          width: imgSize,
          height: imgSize,
        }}
        resizeMode="contain"
      />
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path d={`${outerRect} ${hex}`} fill={bgColor} fillRule="evenodd" />
      </Svg>
    </View>
  );
}

function HexagonBorder({ size, color }: { size: number; color: string }) {
  const points = hexagonPoints(size);
  const vb = `-${HEX_SVG_PAD} -${HEX_SVG_PAD} ${size + 2 * HEX_SVG_PAD} ${size + 2 * HEX_SVG_PAD}`;
  return (
    <Svg width={size} height={size} viewBox={vb} style={StyleSheet.absoluteFill}>
      <Polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Statyczny tile-pattern z malymi ikonami w naszych kolorach.
 * Renderuje siatke wierszy ze staggerowanymi (przesuwanymi) ikonami w stylu
 * tapety: tabletki, dzwoneczki, zegary, buzki, serduszka, plusy, gwiazdki itd.
 */
const PATTERN_ICONS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  'pill',
  'bell-outline',
  'emoticon-happy-outline',
  'pill-multiple',
  'clock-outline',
  'heart-outline',
  'plus',
  'star-four-points-outline',
  'pill',
  'emoticon-outline',
  'medical-bag',
  'pill-multiple',
];

function IconPattern({
  width,
  height,
  iconSize = 22,
  colors,
  opacity = 0.45,
}: {
  width: number;
  height: number;
  iconSize?: number;
  colors: string[];
  opacity?: number;
}) {
  const cellW = iconSize + 26;
  const cellH = iconSize + 18;
  const cols = Math.ceil(width / cellW) + 1;
  const rows = Math.ceil(height / cellH) + 1;

  const items: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * 3 + c * 5) % PATTERN_ICONS.length;
      const icon = PATTERN_ICONS[idx];
      const color = colors[(r + c) % colors.length];
      const offsetX = r % 2 === 0 ? 0 : cellW / 2;
      const left = c * cellW + offsetX - cellW / 2;
      const top = r * cellH;
      const rotate = ((r * 17 + c * 11) % 30) - 15; // -15° do +15°
      items.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left,
            top,
            opacity,
            transform: [{ rotate: `${rotate}deg` }],
          }}
        >
          <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
        </View>
      );
    }
  }

  return (
    <View
      pointerEvents="none"
      style={{ width, height, overflow: 'hidden' }}
    >
      {items}
    </View>
  );
}

export default function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(textFade, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 12,
            stiffness: 140,
          }),
          Animated.timing(textFade, {
            toValue: 1,
            duration: 400,
            delay: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [fade, scale, textFade]);

  const handleStart = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('hasSeenWelcome', 'true');
      } else {
        await SecureStore.setItemAsync('hasSeenWelcome', 'true');
      }
    } catch (e) {
      // ignore
    }
    router.replace('/consents');
  };

  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      <View style={styles.iconsRow}>
        <IconPattern
          width={SCREEN_WIDTH}
          height={150}
          iconSize={22}
          colors={[
            OnboardingPalette.primary,
            OnboardingPalette.surfaceMuted,
          ]}
          opacity={0.55}
        />
      </View>

      <View style={styles.hexagonWrapper}>
        <Animated.View
          style={[
            styles.hexagonAnimated,
            {
              width: HEX_SIZE,
              height: HEX_SIZE,
              opacity: fade,
              transform: [{ scale }],
            },
          ]}
        >
          <HexagonImage
            key={slide.title}
            source={slide.image}
            size={HEX_SIZE}
            bgColor={BG_COLOR}
            interiorTint={slide.interiorTint}
          />
          <HexagonBorder size={HEX_SIZE} color={slide.accentColor} />
        </Animated.View>
        {/* Delikatna „podstawka” tylko pod spodem heksa — nie nachodzi na wnetrze */}
        <View
          pointerEvents="none"
          style={[
            styles.hexFootOuter,
            { width: HEX_SIZE, marginTop: -HEX_SIZE * 0.04 },
          ]}
        >
          <LinearGradient
            colors={
              slide.interiorTint === 'warm'
                ? [
                    'rgba(233, 164, 61, 0.14)',
                    'rgba(233, 164, 61, 0.06)',
                    'rgba(249, 243, 239, 0)',
                  ]
                : [
                    'rgba(27, 60, 83, 0.1)',
                    'rgba(210, 193, 182, 0.2)',
                    'rgba(249, 243, 239, 0)',
                  ]
            }
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.hexFootGradient}
          />
        </View>
      </View>

      <Animated.View style={[styles.textBlock, { opacity: textFade }]}>
        <Text style={styles.title}>{slide.title}</Text>
        {slide.subtitle ? (
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        ) : (
          <Text style={[styles.subtitle, { opacity: 0 }]}>placeholder</Text>
        )}
      </Animated.View>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && {
                backgroundColor: slide.accentColor,
                width: 24,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.ctaShadowWrap}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.ctaPressable,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[...OnboardingGradient.colors]}
              start={OnboardingGradient.start}
              end={OnboardingGradient.end}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Zaczynamy</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={24}
                color={OnboardingPalette.surface}
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR, // ciepły kremowy/beżowy
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconsRow: {
    width: '100%',
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexagonWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: HEX_SIZE,
    flexShrink: 0,
    marginTop: 4,
    marginBottom: HEX_SIZE * 0.02,
    overflow: 'visible',
  },
  hexagonAnimated: {
    overflow: 'visible',
  },
  hexFootOuter: {
    height: HEX_SIZE * 0.1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  hexFootGradient: {
    width: '72%',
    height: '100%',
    borderRadius: 9999,
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 90,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 18,
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
    opacity: 0.7,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: OnboardingPalette.surfaceMuted,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  ctaShadowWrap: {
    borderRadius: Theme.borderRadius.round,
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaPressable: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
  },
  ctaButton: {
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: OnboardingPalette.surface,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
