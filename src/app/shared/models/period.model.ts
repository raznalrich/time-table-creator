export interface Period {
  key: string;
  label: string;
  start: string;
  end: string;
  duration: number;
  type: 'class' | 'break' | 'lunch';
}