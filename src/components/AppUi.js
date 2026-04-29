import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const Section = ({ title, subtitle, children, rightAction }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction}
    </View>
    {children}
  </View>
);

export const SummaryCard = ({ label, value, tone, compact }) => (
  <View
    style={[
      styles.summaryCard,
      compact && styles.summaryCardCompact,
      tone === 'green' && styles.summaryGreen,
      tone === 'gold' && styles.summaryGold,
    ]}
  >
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

export const ListBlock = ({ items, emptyMessage, render }) => (
  items.length ? items.map(render) : <Text style={styles.emptyText}>{emptyMessage}</Text>
);

export const ModuleTabs = ({ items, activeItem, onSelect }) => (
  <View style={styles.chipWrap}>
    {items.map((name) => (
      <Pressable
        key={name}
        style={[styles.moduleChip, activeItem === name && styles.moduleChipActive]}
        onPress={() => onSelect(name)}
      >
        <Text style={[styles.moduleChipText, activeItem === name && styles.moduleChipTextActive]}>
          {name}
        </Text>
      </Pressable>
    ))}
  </View>
);

export const FormField = ({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  editable = true,
  placeholder,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  autoCorrect = false,
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        multiline && styles.multiLineInput,
        !editable && styles.inputDisabled,
      ]}
      placeholder={placeholder ?? ''}
      value={String(value ?? '')}
      onChangeText={onChangeText}
      multiline={multiline}
      editable={editable}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      autoCorrect={autoCorrect}
      placeholderTextColor="#7a7f87"
    />
  </View>
);

export const ActionButton = ({ label, onPress, tone = 'primary', disabled }) => (
  <Pressable
    style={[
      styles.button,
      tone === 'primary' && styles.primaryButton,
      tone === 'secondary' && styles.secondaryButton,
      tone === 'danger' && styles.dangerButton,
      disabled && styles.buttonDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text
      style={[
        styles.buttonText,
        tone === 'secondary' && styles.secondaryButtonText,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

export const InlineActionRow = ({ children }) => (
  <View style={styles.inlineActionRow}>{children}</View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#101114',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#272a31',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#f7f7f8',
  },
  sectionSubtitle: {
    marginTop: 6,
    color: '#a8adb6',
    lineHeight: 20,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#181b21',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2c313a',
  },
  summaryCardCompact: {
    width: '100%',
  },
  summaryGreen: {
    backgroundColor: '#10281e',
    borderColor: '#1f6b49',
  },
  summaryGold: {
    backgroundColor: '#2c2412',
    borderColor: '#8a6a1e',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
  },
  summaryLabel: {
    color: '#b4bac4',
    marginTop: 4,
  },
  emptyText: {
    color: '#8f96a3',
    fontStyle: 'italic',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleChip: {
    backgroundColor: '#17191f',
    borderWidth: 1,
    borderColor: '#2b3038',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moduleChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  moduleChipText: {
    color: '#d5d9df',
    fontWeight: '700',
  },
  moduleChipTextActive: {
    color: '#050505',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#c9cdd4',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#050505',
    borderColor: '#30343c',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f4f5f6',
  },
  inputDisabled: {
    backgroundColor: '#191b20',
    color: '#8f96a3',
  },
  multiLineInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#178d5b',
  },
  secondaryButton: {
    backgroundColor: '#1b1e24',
    borderWidth: 1,
    borderColor: '#353a44',
  },
  dangerButton: {
    backgroundColor: '#b83246',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#f1f3f5',
  },
  inlineActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
});
