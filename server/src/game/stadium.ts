import type { Stadium, Wall, Vector2 } from '../types/game.ts';

export class StadiumConfig {
  static createClassicStadium(): Stadium {
    // Horizontal field (3x larger than original)
    const width = 1260; // 420 * 3
    const height = 600;  // 200 * 3
    const goalWidth = 192; // 64 * 3
    const goalDepth = 45;  // 15 * 3
    
    const walls: Wall[] = [];
    
    // Top wall (left section)
    walls.push({
      start: { x: -width/2, y: -height/2 },
      end: { x: width/2, y: -height/2 },
      normal: { x: 0, y: 1 }
    });
    
    // Bottom wall (full length)
    walls.push({
      start: { x: -width/2, y: height/2 },
      end: { x: width/2, y: height/2 },
      normal: { x: 0, y: -1 }
    });
    
    // Left wall (top section)
    walls.push({
      start: { x: -width/2, y: -height/2 },
      end: { x: -width/2, y: -goalWidth/2 },
      normal: { x: 1, y: 0 }
    });
    
    // Left wall (bottom section)
    walls.push({
      start: { x: -width/2, y: goalWidth/2 },
      end: { x: -width/2, y: height/2 },
      normal: { x: 1, y: 0 }
    });
    
    // Right wall (top section)
    walls.push({
      start: { x: width/2, y: -height/2 },
      end: { x: width/2, y: -goalWidth/2 },
      normal: { x: -1, y: 0 }
    });
    
    // Right wall (bottom section)
    walls.push({
      start: { x: width/2, y: goalWidth/2 },
      end: { x: width/2, y: height/2 },
      normal: { x: -1, y: 0 }
    });
    
    // Left goal walls (red team goal)
    walls.push({
      start: { x: -width/2, y: -goalWidth/2 },
      end: { x: -width/2 - goalDepth, y: -goalWidth/2 },
      normal: { x: 0, y: 1 }
    });
    
    walls.push({
      start: { x: -width/2, y: goalWidth/2 },
      end: { x: -width/2 - goalDepth, y: goalWidth/2 },
      normal: { x: 0, y: -1 }
    });
    
    walls.push({
      start: { x: -width/2 - goalDepth, y: -goalWidth/2 },
      end: { x: -width/2 - goalDepth, y: goalWidth/2 },
      normal: { x: 1, y: 0 }
    });
    
    // Right goal walls (blue team goal)
    walls.push({
      start: { x: width/2, y: -goalWidth/2 },
      end: { x: width/2 + goalDepth, y: -goalWidth/2 },
      normal: { x: 0, y: 1 }
    });
    
    walls.push({
      start: { x: width/2, y: goalWidth/2 },
      end: { x: width/2 + goalDepth, y: goalWidth/2 },
      normal: { x: 0, y: -1 }
    });
    
    walls.push({
      start: { x: width/2 + goalDepth, y: -goalWidth/2 },
      end: { x: width/2 + goalDepth, y: goalWidth/2 },
      normal: { x: -1, y: 0 }
    });

    return {
      width,
      height,
      goalWidth,
      goalDepth,
      walls
    };
  }

  static isInGoal(position: Vector2, stadium: Stadium): 'red' | 'blue' | null {
    const { width, height, goalWidth, goalDepth } = stadium;
    
    // Left goal (red team defends, blue scores here)
    if (position.y >= -goalWidth/2 && position.y <= goalWidth/2 && 
        position.x <= -width/2 && position.x >= -width/2 - goalDepth) {
      return 'blue';
    }
    
    // Right goal (blue team defends, red scores here)
    if (position.y >= -goalWidth/2 && position.y <= goalWidth/2 && 
        position.x >= width/2 && position.x <= width/2 + goalDepth) {
      return 'red';
    }
    
    return null;
  }

  static getPlayerSpawnPosition(team: 'red' | 'blue', playerIndex: number): Vector2 {
    const formations = {
      red: [
        { x: -150, y: 0 },     // Defender (scaled 3x)
        { x: -240, y: -90 },   // Left midfielder (scaled 3x)
        { x: -240, y: 90 },    // Right midfielder (scaled 3x)
        { x: -360, y: 0 }      // Forward (scaled 3x)
      ],
      blue: [
        { x: 150, y: 0 },      // Defender (scaled 3x)
        { x: 240, y: -90 },    // Left midfielder (scaled 3x)
        { x: 240, y: 90 },     // Right midfielder (scaled 3x)
        { x: 360, y: 0 }       // Forward (scaled 3x)
      ]
    };
    
    const positions = formations[team];
    return positions[playerIndex % positions.length];
  }

  static getBallSpawnPosition(): Vector2 {
    return { x: 0, y: 0 };
  }
}