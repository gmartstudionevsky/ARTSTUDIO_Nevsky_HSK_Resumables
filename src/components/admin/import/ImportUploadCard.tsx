import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

type Props = {
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
  loading: boolean;
  hasFile: boolean;
};

export function ImportUploadCard({
  onFileChange,
  onPreview,
  loading,
  hasFile,
}: Props): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Загрузка XLSX</CardTitle>
        <CardDescription>
          Импорт ищет канонические поля в таблице, пытается разметить строки автоматически и
          показывает предпросмотр итогов и полной разметки.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          accept=".xlsx"
          className="block w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <Button onClick={onPreview} disabled={!hasFile} loading={loading}>
          Предпросмотр
        </Button>
      </CardContent>
    </Card>
  );
}
