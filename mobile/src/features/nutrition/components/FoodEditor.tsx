import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { NumberStepper } from '@/components/NumberStepper';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { foodById } from '../data';
import type { Ingredient } from '../types';
import { quantityInUnit, quantityToBase, totals } from '../utils';
import { CalorieCard, FoodIcon, NutritionRow, s } from './NutritionUI';

export function FoodEditor({ initial, moment, onSave, onRemove, onReplace }: { initial: Ingredient; moment: string; onSave: (value: Ingredient) => void; onRemove: () => void; onReplace: () => void }) {
  const food = foodById[initial.foodId];
  const [amount, setAmount] = useState(initial.amount);
  const [unitIndex, setUnitIndex] = useState('0');
  const unit = food.units[Number(unitIndex)];
  const quantity = quantityInUnit(amount, unit);
  const [entry, setEntry] = useState(String(quantity));
  const update = (value: number) => { const next = quantityToBase(value, unit); setAmount(next); setEntry(String(Number(quantityInUnit(next, unit).toFixed(2)))); };
  const valid = entry.trim() !== '' && Number.isFinite(Number(entry.replace(',', '.'))) && Number(entry.replace(',', '.')) > 0;
  return <>
    <Card style={s.card}><View style={s.row}><FoodIcon name={food.icon} background={colors.accentSurface} size={62} /><View style={{ flex: 1 }}><Text style={s.heading}>{food.name}</Text><Text style={s.muted}>Dans {moment}</Text></View></View></Card>
    {food.presets ? <>{food.presets.map((preset, index) => <ChoiceCard key={preset} role="radio" layout="row" indicatorPosition="leading" selected={Math.abs(amount - preset) < 0.01} title={food.id === 'sauce' ? ['Peu de sauce', 'Quantité moyenne', 'Beaucoup de sauce'][index] : ['Petite portion', 'Portion moyenne', 'Grande portion'][index]} description={`environ ${preset} ${food.baseUnit}`} onPress={() => { setAmount(preset); setEntry(String(Number(quantityInUnit(preset, unit).toFixed(2)))); }} />)}</> : null}
    <Card style={s.card}><Text style={s.muted}>Quantité exacte</Text><NumberStepper label="la quantité" value={quantity} onChange={update} minimum={1 / unit.amount} maximum={10000 / unit.amount} step={unit.amount === 1 ? 10 : 0.25} size="large" formatValue={value => `${Number(value.toFixed(2)).toLocaleString('fr-FR')} ${unit.label}`} /><TextField label="Saisir une quantité" accessibilityLabel="Quantité exacte" value={entry} keyboardType="decimal-pad" onChangeText={text => { setEntry(text); const value = Number(text.replace(',', '.')); if (text.trim() && Number.isFinite(value) && value > 0) setAmount(quantityToBase(value, unit)); }} error={valid ? undefined : 'Saisis une quantité supérieure à zéro.'} /></Card>
    <Card style={s.card}><Text style={s.muted}>Unité</Text><TabSelector value={unitIndex} items={food.units.map((item, index) => ({ value: String(index), label: item.label }))} onChange={index => { setUnitIndex(index); setEntry(String(Number(quantityInUnit(amount, food.units[Number(index)]).toFixed(2)))); }} /><Text style={s.small}>{unit.amount === 1 ? `${Math.round(amount)} ${food.baseUnit}` : `1 ${unit.label} ≈ ${unit.amount} ${food.baseUnit} · total ${Math.round(amount)} ${food.baseUnit}`}{food.id === 'chicken' ? ' de partie comestible, sans os' : ''}</Text></Card>
    <CalorieCard value={totals([{ ...initial, amount }], foodById)} />
    <Card style={s.list}><NutritionRow last title="Remplacer par un autre aliment" icon={<Symbol name="search" />} onPress={onReplace} /></Card>
    <Button text="Enregistrer" disabled={!valid} hapticFeedback="light" onPress={() => onSave({ ...initial, amount })} />
    <Button text="Supprimer cet aliment" variant="outline" textColor={colors.energy} onPress={onRemove} />
  </>;
}
